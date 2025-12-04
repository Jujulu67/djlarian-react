import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../table';

describe('Table Components', () => {
  describe('Table', () => {
    it('should render table', () => {
      render(
        <Table>
          <tbody>
            <tr>
              <td>Test</td>
            </tr>
          </tbody>
        </Table>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Table className="custom-class">
          <tbody>
            <tr>
              <td>Test</td>
            </tr>
          </tbody>
        </Table>
      );

      const table = container.querySelector('table');
      expect(table).toHaveClass('custom-class');
    });
  });

  describe('TableHeader', () => {
    it('should render table header', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
    });
  });

  describe('TableBody', () => {
    it('should render table body', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Cell')).toBeInTheDocument();
    });
  });

  describe('TableFooter', () => {
    it('should render table footer', () => {
      render(
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('TableRow', () => {
    it('should render table row', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Row')).toBeInTheDocument();
    });
  });

  describe('TableHead', () => {
    it('should render table head', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Head</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByText('Head')).toBeInTheDocument();
    });
  });

  describe('TableCell', () => {
    it('should render table cell', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Cell')).toBeInTheDocument();
    });
  });

  describe('TableCaption', () => {
    it('should render table caption', () => {
      render(
        <Table>
          <TableCaption>Caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Caption')).toBeInTheDocument();
    });
  });
});
